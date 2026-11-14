// app/(admin)/system/interests/new/page.tsx
import { InterestFormClient } from "../_components/interest-form-client";

export default function NewInterestPage() {
  return <InterestFormClient interestId={null} backUrl="/system/interests" />;
}
