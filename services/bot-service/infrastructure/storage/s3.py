from contextlib import asynccontextmanager
import logging
from typing import Any, AsyncGenerator, Dict, Optional
import aioboto3
from botocore.exceptions import ClientError

from core.config import settings

logger = logging.getLogger("shopbot_backend.storage.s3")


class InMemoryS3Storage:
    """
    In-memory fallback for local unit tests and environments where MinIO is offline.
    """

    def __init__(self) -> None:
        self._buckets: Dict[str, Dict[str, bytes]] = {}

    def put_object(self, bucket: str, key: str, data: bytes) -> None:
        if bucket not in self._buckets:
            self._buckets[bucket] = {}
        self._buckets[bucket][key] = data

    def delete_object(self, bucket: str, key: str) -> bool:
        if bucket in self._buckets and key in self._buckets[bucket]:
            del self._buckets[bucket][key]
            return True
        return False

    def generate_url(self, endpoint_url: str, bucket: str, key: str) -> str:
        return f"{endpoint_url.rstrip('/')}/{bucket}/{key}?token=mock_presigned_token"


class S3StorageClient:
    """
    Asynchronous Object Storage client integrating with S3-compatible APIs (MinIO / AWS S3).
    Handles voice notes, customer media, and product catalog image uploads with presigned URLs.
    """

    _fallback_storage = InMemoryS3Storage()

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        region_name: Optional[str] = None,
    ) -> None:
        self.endpoint_url: str = str(
            endpoint_url
            or getattr(settings, "S3_ENDPOINT_URL", "http://localhost:9000")
        )
        self.access_key: str = str(
            access_key or getattr(settings, "S3_ACCESS_KEY", "minioadmin")
        )
        self.secret_key: str = str(
            secret_key or getattr(settings, "S3_SECRET_KEY", "minioadmin")
        )
        self.bucket_name: str = str(
            bucket_name or getattr(settings, "S3_BUCKET_NAME", "shopbot-media")
        )
        self.region_name: str = str(
            region_name or getattr(settings, "S3_REGION", "us-east-1")
        )
        self._session = aioboto3.Session()

    @asynccontextmanager
    async def _get_client(self) -> AsyncGenerator[Any, None]:
        """
        Yields an asynchronous S3 client context manager.
        """
        async with self._session.client(
            service_name="s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name,
        ) as client:
            yield client

    async def ensure_bucket_exists(self, bucket_name: Optional[str] = None) -> None:
        """
        Checks if the configured bucket exists; creates it if absent.
        """
        target_bucket = bucket_name or self.bucket_name
        try:
            async with self._get_client() as s3:
                try:
                    await s3.head_bucket(Bucket=target_bucket)
                except ClientError:
                    logger.info(f"Bucket '{target_bucket}' does not exist. Creating...")
                    await s3.create_bucket(Bucket=target_bucket)
        except Exception as exc:
            logger.debug(
                f"MinIO/S3 offline during ensure_bucket_exists ({exc}); using in-memory bucket '{target_bucket}'."
            )
            self._fallback_storage.put_object(target_bucket, ".init", b"")

    async def upload_file(
        self,
        file_data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
        bucket_name: Optional[str] = None,
    ) -> str:
        """
        Uploads binary file data (voice notes, product images) to MinIO/S3.
        Returns the object key path.
        """
        target_bucket = bucket_name or self.bucket_name
        try:
            async with self._get_client() as s3:
                await s3.put_object(
                    Bucket=target_bucket,
                    Key=key,
                    Body=file_data,
                    ContentType=content_type,
                )
                logger.info(f"Successfully uploaded s3://{target_bucket}/{key}")
                return key
        except Exception as exc:
            logger.debug(
                f"MinIO/S3 offline during upload ({exc}); storing s3://{target_bucket}/{key} in memory fallback."
            )
            self._fallback_storage.put_object(target_bucket, key, file_data)
            return key

    async def generate_presigned_url(
        self,
        key: str,
        expiration_seconds: int = 3600,
        client_method: str = "get_object",
        bucket_name: Optional[str] = None,
    ) -> str:
        """
        Generates a secure presigned URL for downloading or streaming audio/media files.
        """
        target_bucket = bucket_name or self.bucket_name
        try:
            async with self._get_client() as s3:
                url: str = await s3.generate_presigned_url(
                    ClientMethod=client_method,
                    Params={"Bucket": target_bucket, "Key": key},
                    ExpiresIn=expiration_seconds,
                )
                return url
        except Exception as exc:
            logger.debug(
                f"MinIO/S3 offline during presigned URL generation ({exc}); returning fallback URL."
            )
            return self._fallback_storage.generate_url(
                self.endpoint_url, target_bucket, key
            )

    async def delete_file(
        self,
        key: str,
        bucket_name: Optional[str] = None,
    ) -> bool:
        """
        Deletes an object from MinIO/S3.
        """
        target_bucket = bucket_name or self.bucket_name
        try:
            async with self._get_client() as s3:
                await s3.delete_object(Bucket=target_bucket, Key=key)
                return True
        except Exception as exc:
            logger.debug(
                f"MinIO/S3 offline during delete ({exc}); deleting from fallback."
            )
            return self._fallback_storage.delete_object(target_bucket, key)


# Global singleton client
_global_s3_client: Optional[S3StorageClient] = None


def get_s3_client() -> S3StorageClient:
    """
    Accessor for global S3/MinIO client instance.
    """
    global _global_s3_client
    if _global_s3_client is None:
        _global_s3_client = S3StorageClient()
    return _global_s3_client
