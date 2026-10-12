import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "../lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const version = useRef(0);
  const setUser = useCallback((next) => {
    version.current++;
    setUserState(next);
    setError("");
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    const requestVersion = ++version.current;
    setLoading(true);
    setError("");
    try {
      const data = await api("/auth/me");
      if (version.current === requestVersion) setUserState(data.user);
    } catch (e) {
      if (version.current === requestVersion) {
        if (e.status === 401) setUserState(null);
        else setError(e.message);
      }
    } finally {
      if (version.current === requestVersion) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    return () => {
      version.current++;
    };
  }, [refresh]);
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, error, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
