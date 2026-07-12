import { auth } from "../config/firebase";

export async function callApi<T>(input: string, init: RequestInit = {}): Promise<T> {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(input, {
        ...init,
        headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.error?.message || payload?.error || payload?.message || "Request failed";
        throw new Error(message);
    }

    return payload as T;
}
