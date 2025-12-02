const API_URL = "http://localhost:4000/api/auth";

export interface AuthResponse {
   token: string;
   full_name: string;
   email: string;
}

export async function register(full_name: string, email: string, password: string) {
   const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password }),
   });
   if (!response.ok) throw new Error("Registration failed");
   return (await response.json()) as AuthResponse;
}

export async function login(email: string, password: string) {
   const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
   });
   if (!response.ok) throw new Error("Invalid email or password");
   return (await response.json()) as AuthResponse;
}
