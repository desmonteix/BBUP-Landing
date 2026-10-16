import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), getUser: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendPasswordReset: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp: mocks.signup, getUser: mocks.getUser }, from: () => ({ update: mocks.update }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => ({ insert: (row: unknown) => mocks.insert(table, row) }) }) }));
import { signUp, updateProfile, reportInvalidSignup } from "./auth";
function form(dni = "61234567", nationality = "Peruvian") {
  const data = new FormData();
  for (const [key, value] of Object.entries({ firstName: "Ana", lastName: "Perez", dniId: dni, nationality, email: "ana@example.com", password: "long-password" })) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "buyer" } } });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.signup.mockResolvedValue({ data: { user: { id: "buyer" }, session: null }, error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
});
it("rejects and logs a forged Peruvian signup before creating an auth account", async () => {
  expect(await signUp({ status: "idle" }, form())).toMatchObject({ status: "error", errorType: "TypeError" });
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(mocks.insert).toHaveBeenCalledWith("nationality_failures", expect.objectContaining({ full_name: "Ana Perez", message: "Nacionalidad fallida" }));
});
it.each(["8123456789", "7123456a", "7123-567", " 71234567", "71234567 "])("never creates Auth or profile rows for invalid Peruvian DNI %j", async (dni) => {
  expect(await signUp({ status: "idle" }, form(dni))).toMatchObject({ status: "error", errorType: "TypeError" });
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalledWith("profiles", expect.anything());
  expect(mocks.insert).toHaveBeenCalledWith("nationality_failures", expect.objectContaining({ message: "Nacionalidad fallida" }));
});
it("the client rejection action can only log and cannot create an account", async () => {
  expect(await reportInvalidSignup(form("8123456789"))).toMatchObject({ status: "error", errorType: "TypeError" });
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(mocks.insert).toHaveBeenCalledWith("nationality_failures", expect.objectContaining({ full_name: "Ana Perez", message: "Nacionalidad fallida" }));
});
it("even a forged valid submission to the rejection action cannot create an account", async () => {
  expect(await reportInvalidSignup(form("71234567"))).toMatchObject({ status: "error" });
  expect(mocks.signup).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
});
it.each([["71234567", "Peruvian"], ["AB12345", "German"]])("allows valid signup %s %s", async (dni, nationality) => {
  expect(await signUp({ status: "idle" }, form(dni, nationality))).toMatchObject({ status: "success" });
  expect(mocks.signup).toHaveBeenCalledOnce();
  expect(mocks.insert).toHaveBeenCalledWith("profiles", expect.objectContaining({ dni_id: dni, nationality }));
  expect(mocks.insert).not.toHaveBeenCalledWith("nationality_failures", expect.anything());
});
it("rejects and logs changing nationality with an invalid DNI", async () => {
  expect(await updateProfile({ status: "idle" }, form())).toMatchObject({ errorType: "TypeError" });
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.insert).toHaveBeenCalledWith("nationality_failures", expect.objectContaining({ profile_id: "buyer", message: "Nacionalidad fallida" }));
});
it("lets an existing user correct their DNI and save a valid Peruvian profile", async () => {
  expect(await updateProfile({ status: "idle" }, form("71234567"))).toMatchObject({ status: "success" });
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ dni_id: "71234567", nationality: "Peruvian" }));
  expect(mocks.eq).toHaveBeenCalledWith("id", "buyer");
});
it("requires authentication before editing a profile or logging a profile failure", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect(await updateProfile({ status: "idle" }, form())).toMatchObject({ status: "error" });
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
