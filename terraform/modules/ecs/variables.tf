variable "cluster_name" {
  type = string
}

variable "repo_url" {
  type = string
}

variable "image_tag" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnets" {
  type = list(string)
}

variable "aws_account_id" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}
