import { Suspense } from "react";
import PatientProfilePage from "./client";
export function generateStaticParams() { return [{ id: '_' }]; }
export default function Page() { return <Suspense><PatientProfilePage /></Suspense>; }
