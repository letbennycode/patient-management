"""Optional LLM narrative. Returns None on any failure so callers fall back to the template.

Never log prompts, note content or model output here.
"""

import httpx

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
TIMEOUT_SECONDS = 10.0
INSTRUCTION = (
    "Write a concise 3-5 sentence clinical summary of this patient for a clinician, "
    "based only on the data below. Do not invent facts. Plain text, no headings or lists."
)


def generate_narrative(api_key: str, model: str, patient_context: str) -> str | None:
    try:
        response = httpx.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 400,
                "messages": [{"role": "user", "content": f"{INSTRUCTION}\n\n{patient_context}"}],
            },
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        blocks = response.json().get("content") or []
        text = "".join(b.get("text") or "" for b in blocks if b.get("type") == "text").strip()
    except (httpx.HTTPError, ValueError, AttributeError, TypeError):
        return None
    return text or None
