"""generate_narrative() is tested with httpx.post replaced, the one boundary we don't control."""

from typing import Any

import httpx
import pytest

from app.services import llm


class FakePost:
    """Stand-in for httpx.post that records the call and returns a canned response."""

    def __init__(self, status: int = 200, json: Any = None, error: Exception | None = None):
        self.status, self.json, self.error = status, json, error
        self.calls: list[dict[str, Any]] = []

    def __call__(self, url: str, **kwargs: Any) -> httpx.Response:
        self.calls.append({"url": url, **kwargs})
        if self.error:
            raise self.error
        return httpx.Response(self.status, json=self.json, request=httpx.Request("POST", url))


def _install(monkeypatch: pytest.MonkeyPatch, fake: FakePost) -> FakePost:
    monkeypatch.setattr(llm.httpx, "post", fake)
    return fake


def test_generate_narrative_returns_joined_text_blocks(monkeypatch: pytest.MonkeyPatch) -> None:
    _install(monkeypatch, FakePost(json={"content": [
        {"type": "text", "text": "  Stable patient. "},
        {"type": "tool_use", "text": "ignored"},
        {"type": "text", "text": "Follow up in 3 months.  "},
    ]}))  # fmt: skip

    result = llm.generate_narrative("key", "model", "context")

    assert result == "Stable patient. Follow up in 3 months."


def test_generate_narrative_sends_key_model_and_context(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _install(monkeypatch, FakePost(json={"content": [{"type": "text", "text": "ok"}]}))

    llm.generate_narrative("secret-key", "some-model", "Name: Zelda Quill")

    [call] = fake.calls
    assert call["url"] == llm.ANTHROPIC_URL
    assert call["headers"]["x-api-key"] == "secret-key"
    assert call["json"]["model"] == "some-model"
    assert "Name: Zelda Quill" in call["json"]["messages"][0]["content"]
    assert call["timeout"] == 10.0


@pytest.mark.parametrize(
    "fake",
    [
        FakePost(error=httpx.ReadTimeout("timed out")),
        FakePost(error=httpx.ConnectError("refused")),
        FakePost(status=500, json={"error": "boom"}),
        FakePost(status=401, json={"error": "bad key"}),
        FakePost(json={"content": []}),
        FakePost(json={"content": [{"type": "text", "text": "   "}]}),
        FakePost(json=["not", "an", "object"]),
    ],
    ids=["timeout", "connect-error", "500", "401", "no-blocks", "blank-text", "list-body"],
)
def test_generate_narrative_returns_none_on_failure_or_empty_output(
    monkeypatch: pytest.MonkeyPatch, fake: FakePost
) -> None:
    _install(monkeypatch, fake)

    assert llm.generate_narrative("key", "model", "context") is None


@pytest.mark.parametrize(
    "payload",
    [{"content": None}, {"content": [{"type": "text", "text": None}]}],
    ids=["null-content", "null-text"],
)
def test_generate_narrative_returns_none_for_malformed_success_body(
    monkeypatch: pytest.MonkeyPatch, payload: dict[str, Any]
) -> None:
    # Contract (module docstring): "Returns None on any failure".
    _install(monkeypatch, FakePost(json=payload))

    assert llm.generate_narrative("key", "model", "context") is None
