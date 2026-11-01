import os
from pathlib import Path
import sys
from grpc_tools import protoc


def compile_protos() -> None:
    """
    Compiles Protocol Buffers definitions into Python gRPC stubs.
    Handles module relative imports for robust package integration.
    """
    base_dir = Path(__file__).resolve().parent
    protos_dir = base_dir / "protos"
    proto_file = protos_dir / "ai_processor.proto"

    if not proto_file.exists():
        raise FileNotFoundError(f"Proto definition not found: {proto_file}")

    print(f"Compiling {proto_file.name}...")

    # We include base_dir and protos_dir in include paths
    protoc_args = [
        "protoc",
        f"-I{protos_dir}",
        f"--python_out={protos_dir}",
        f"--grpc_python_out={protos_dir}",
        str(proto_file),
    ]

    status_code = protoc.main(protoc_args)
    if status_code != 0:
        print(
            f"protoc compilation failed with status code {status_code}", file=sys.stderr
        )
        sys.exit(status_code)

    # Post-process generated gRPC file to ensure clean intra-package relative import
    grpc_stub_path = protos_dir / "ai_processor_pb2_grpc.py"
    if grpc_stub_path.exists():
        stub_code = grpc_stub_path.read_text(encoding="utf-8")
        if (
            "import ai_processor_pb2 as" in stub_code
            and "from . import" not in stub_code
        ):
            stub_code = stub_code.replace(
                "import ai_processor_pb2 as",
                "from . import ai_processor_pb2 as",
            )
            grpc_stub_path.write_text(stub_code, encoding="utf-8")
            print("Patched ai_processor_pb2_grpc.py with relative import.")

    # Create/update protos/__init__.py
    init_file = protos_dir / "__init__.py"
    init_content = (
        '"""\n'
        "Generated Protocol Buffers and gRPC stubs for AI Microservice.\n"
        '"""\n'
        "try:\n"
        "    from protos import ai_processor_pb2, ai_processor_pb2_grpc\n"
        '    __all__ = ["ai_processor_pb2", "ai_processor_pb2_grpc"]\n'
        "except ImportError:\n"
        "    pass\n"
    )
    init_file.write_text(init_content, encoding="utf-8")
    print("Protobuf compilation completed successfully.")


if __name__ == "__main__":
    compile_protos()
