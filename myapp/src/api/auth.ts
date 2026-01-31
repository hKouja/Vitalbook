const API_URL = "http://localhost:4000/api/auth";

export interface AuthResponse {
   token: string;
   full_name: string;
   email: string;
}

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
};


export async function register(full_name: string, email: string, password: string) {
   const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password }),
   });
   const data = await response.json();
   if (!response.ok) {
      throw new Error(("error" in data && data.error) ? data.error : "Registration failed");
   }
   return data as RegisterResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as Partial<AuthResponse> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Invalid email or password");
  }

  return data as AuthResponse;
}
