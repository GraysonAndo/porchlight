"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepShell } from "@/components/StepShell";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Card } from "@/components/ui";
import { PROPERTY, SAMPLE_PHOTO, SEED_REQUEST_TEXT } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import type { Photo } from "@/lib/types";

function RequestForm({ initialText, initialPhotos }: { initialText: string; initialPhotos: Photo[] }) {
  const router = useRouter();
  const { actions } = useDemo();
  const [description, setDescription] = useState(initialText);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [error, setError] = useState("");

  function submit() {
    if (description.trim().length < 5) {
      setError("Please tell us what is wrong, in a sentence or two.");
      return;
    }
    setError("");
    actions.setRole("tenant");
    actions.submitRequest(description.trim(), photos);
    router.push("/tenant/safety");
  }

  return (
    <StepShell stepId="tenant-report" nextLabel="Submit" onNext={submit} narrow>
      <Card>
        <div className="space-y-5">
          <div>
            <label htmlFor="unit" className="label">
              Unit
            </label>
            <input
              id="unit"
              className="field"
              readOnly
              value={`${PROPERTY.address} (${PROPERTY.unitLabel})`}
            />
          </div>

          <div>
            <label htmlFor="contact" className="label">
              Your contact
            </label>
            <input
              id="contact"
              className="field"
              readOnly
              value={`${PROPERTY.tenant}, ${PROPERTY.tenantPhone}`}
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              What is wrong?
            </label>
            <textarea
              id="description"
              className="field min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-describedby="description-hint"
              aria-invalid={error ? true : undefined}
            />
            <p id="description-hint" className="hint">
              Sample text is filled in for the demo. Edit it if you like.
            </p>
            {error && (
              <p role="alert" className="mt-1 font-bold text-urgent">
                {error}
              </p>
            )}
          </div>

          <PhotoPicker
            label="Add a photo"
            photos={photos}
            onChange={setPhotos}
            sample={SAMPLE_PHOTO}
            sampleButtonLabel="Use sample photo"
            multiple
            hint="A photo helps us judge how serious this is. Your owner makes the repair decision, so you do not need to find or call anyone."
          />
        </div>
      </Card>
    </StepShell>
  );
}

export default function TenantRequestPage() {
  const { state, hydrated } = useDemo();

  // Wait for saved state before filling the form, so a returning visitor sees their own request.
  if (!hydrated) {
    return (
      <StepShell stepId="tenant-report" nextLabel="Submit" nextDisabled narrow>
        <p className="text-ink-soft">Loading...</p>
      </StepShell>
    );
  }

  return (
    <RequestForm
      initialText={state.request?.description ?? SEED_REQUEST_TEXT}
      initialPhotos={state.request?.photos ?? []}
    />
  );
}
