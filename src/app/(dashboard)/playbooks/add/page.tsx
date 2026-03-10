"use client";

import { PlaybookForm } from "@/components/playbook-form";

export default function AddPlaybookPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Create Playbook</h1>
      <PlaybookForm mode="create" />
    </div>
  );
}
