import os
import uvicorn

try:
    import spaces
    from spaces.config import Config as _SpacesConfig

    @spaces.GPU(duration=10)
    def _hf_zerogpu_probe() -> str:
        return "ready"

    if getattr(_SpacesConfig, "zero_gpu", False):
        spaces.zero.startup()
except ImportError:
    pass

from backend.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT") or os.environ.get("GRADIO_SERVER_PORT") or "7860")
    uvicorn.run(app, host="0.0.0.0", port=port)
