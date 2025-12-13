terraform {
  backend "s3" {
    bucket  = "haris-terraform-states"
    key     = "node-app/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}