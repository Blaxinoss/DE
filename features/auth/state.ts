export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
};

export const initialAuthState: AuthState = { status: "idle" };
