variable "ecs_cluster_name"  { default = "node-app-cluster" }
variable "ecs_service_name"  { default = "node-app-cluster-service" }
variable "devops_agent_secret_name" { default = "devops-agent-webhook" }

data "aws_region" "current" {}
data "aws_secretsmanager_secret" "webhook" { name = var.devops_agent_secret_name }

locals {
  cluster_arn = "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:cluster/${var.ecs_cluster_name}"
  service_arn = "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:service/${var.ecs_cluster_name}/${var.ecs_service_name}"
}

data "archive_file" "trigger" {
  type        = "zip"
  source_file = "${path.module}/lambda/devops_agent_trigger.py"
  output_path = "${path.module}/lambda/devops_agent_trigger.zip"
}

resource "aws_iam_role" "trigger" {
  name = "devops-agent-trigger-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole",
                   Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "trigger_logs" {
  role       = aws_iam_role.trigger.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "trigger_secret" {
  name = "read-webhook-secret"
  role = aws_iam_role.trigger.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "secretsmanager:GetSecretValue",
                   Resource = data.aws_secretsmanager_secret.webhook.arn }]
  })
}

resource "aws_lambda_function" "trigger" {
  function_name    = "devops-agent-trigger"
  role             = aws_iam_role.trigger.arn
  handler          = "devops_agent_trigger.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30
  filename         = data.archive_file.trigger.output_path
  source_code_hash = data.archive_file.trigger.output_base64sha256
  environment {
    variables = { SECRET_ID = var.devops_agent_secret_name }
  }
}

# Rule 1: circuit breaker / deployment failure (fires once per failed deployment)
resource "aws_cloudwatch_event_rule" "deploy_failed" {
  name = "ecs-deployment-failed"
  event_pattern = jsonencode({
    source        = ["aws.ecs"]
    "detail-type" = ["ECS Deployment State Change"]
    resources     = [local.service_arn]
    detail        = { eventName = ["SERVICE_DEPLOYMENT_FAILED"] }
  })
}

# Rule 2: container crash (non-zero exit), filtered further in the Lambda
resource "aws_cloudwatch_event_rule" "task_crashed" {
  name = "ecs-task-crashed"
  event_pattern = jsonencode({
    source        = ["aws.ecs"]
    "detail-type" = ["ECS Task State Change"]
    detail = {
      clusterArn = [local.cluster_arn]
      lastStatus = ["STOPPED"]
      stopCode   = ["EssentialContainerExited"]
    }
  })
}

resource "aws_cloudwatch_event_target" "deploy_failed" {
  rule = aws_cloudwatch_event_rule.deploy_failed.name
  arn  = aws_lambda_function.trigger.arn
}

resource "aws_cloudwatch_event_target" "task_crashed" {
  rule = aws_cloudwatch_event_rule.task_crashed.name
  arn  = aws_lambda_function.trigger.arn
}

resource "aws_lambda_permission" "deploy_failed" {
  statement_id  = "AllowDeployFailed"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.trigger.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.deploy_failed.arn
}

resource "aws_lambda_permission" "task_crashed" {
  statement_id  = "AllowTaskCrashed"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.trigger.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.task_crashed.arn
}