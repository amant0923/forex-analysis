"""Unified AI provider with multi-model failover support."""



def _strip_code_fences(text: str) -> str:
    """Strip markdown code fences (```json...```) from model responses."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return text


class AIProvider:
    """Tries multiple AI providers in priority order with auto-failover.

    Usage:
        provider = AIProvider()
        provider.add_anthropic(api_key, model="claude-sonnet-4-6")
        provider.add_openai(api_key, model="gpt-4o")
        provider.add_google(api_key, model="gemini-2.0-flash")

        text, provider_name, model_name = provider.complete(system, user, max_tokens)
    """

    def __init__(self):
        self._providers = []  # list of (name, model, callable)

    def add_anthropic(self, api_key: str, model: str = "claude-sonnet-4-6"):
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        def call(system: str, user: str, max_tokens: int) -> str:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return response.content[0].text

        self._providers.append(("anthropic", model, call))

    def add_openai(self, api_key: str, model: str = "gpt-4o"):
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        def call(system: str, user: str, max_tokens: int) -> str:
            response = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            return response.choices[0].message.content

        self._providers.append(("openai", model, call))

    def add_google(self, api_key: str, model: str = "gemini-2.0-flash"):
        from google import genai

        client = genai.Client(api_key=api_key)

        def call(system: str, user: str, max_tokens: int) -> str:
            response = client.models.generate_content(
                model=model,
                contents=user,
                config=genai.types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=max_tokens,
                ),
            )
            return response.text

        self._providers.append(("google", model, call))

    def complete(self, system: str, user: str, max_tokens: int) -> tuple[str, str, str]:
        """Try each provider in order, returning (response_text, provider_name, model_name).

        Raises RuntimeError if all providers fail.
        """
        if not self._providers:
            raise RuntimeError("No AI providers configured")

        errors = []
        for provider_name, model_name, call_fn in self._providers:
            try:
                raw = call_fn(system, user, max_tokens)
                text = _strip_code_fences(raw)
                return text, provider_name, model_name
            except Exception as e:
                print(f"[AIProvider] {provider_name}/{model_name} failed: {e}")
                errors.append((provider_name, e))

        raise RuntimeError(f"All AI providers failed: {errors}")
