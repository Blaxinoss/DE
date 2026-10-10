export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export const initialAuthState: AuthState = { status: "idle" };
