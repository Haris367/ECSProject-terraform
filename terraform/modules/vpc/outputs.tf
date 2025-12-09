output "vpc_id" {
  value = aws_vpc.this.id
}
output "public_subnets" {
  value = [for s in aws_subnet.public : s.id]
}