import { redirect } from "next/navigation";

/** Legacy path — account creation now lives on its own /signup page. */
export default function CreateAccountPage() {
  redirect("/signup");
}
