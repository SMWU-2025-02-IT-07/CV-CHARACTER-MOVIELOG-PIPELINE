
output "frontend_url" {
  description = "Frontend CloudFront URL"
  value       = module.frontend.frontend_url
}

output "frontend_s3_bucket" {
  description = "Frontend S3 bucket name"
  value       = module.frontend.s3_bucket_name
}

output "webhook_url" {
  description = "Webhook URL for ML server"
  value       = module.frontend.webhook_url
}

output "backend_api_url" {
  description = "Backend API endpoint"
  value       = var.deploy_backend ? module.backend[0].api_url : "Not deployed"
}

output "ml_server_public_ip" {
  description = "Public IP of ML server"
  value       = var.deploy_ml_server ? module.ml_server[0].public_ip : "Not deployed"
}

output "ml_server_api_url" {
  description = "ML server API endpoint"
  value       = var.deploy_ml_server ? module.ml_server[0].api_url : "Not deployed"
}

output "s3_videos_bucket" {
  description = "S3 bucket name for videos"
  value       = var.deploy_ml_server ? module.ml_server[0].s3_bucket_name : "Not deployed"
}
