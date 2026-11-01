"""
Object storage infrastructure package providing asynchronous S3/MinIO operations.
"""
from infrastructure.storage.s3 import S3StorageClient, get_s3_client

__all__ = ["S3StorageClient", "get_s3_client"]
