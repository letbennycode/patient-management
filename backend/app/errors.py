class NotFoundError(Exception):
    """Raised by services when a resource doesn't exist; mapped to a 404 in main.py."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail
