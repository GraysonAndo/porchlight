"use client";

import { useId } from "react";
import { SAMPLE_PHOTO_PATH } from "@/lib/seed";
import type { Photo } from "@/lib/types";

export function altFor(photo: Photo): string {
  if (photo.src === SAMPLE_PHOTO_PATH) {
    return "Sample photo of a water heater leaking at the bottom, with water pooling on the garage floor";
  }
  return `Photo you added: ${photo.name}`;
}

function readFile(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, src: String(reader.result ?? ""), isSample: false });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PhotoThumb({ photo, className = "" }: { photo: Photo; className?: string }) {
  if (!photo.src) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border-2 border-dashed border-line bg-cream-deep p-3 text-center text-sm text-ink-soft ${className}`}
      >
        Photo saved: {photo.name}
      </div>
    );
  }
  return (
    // Plain img on purpose: sources are local SVGs and data URLs, so there is nothing to optimize.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.src} alt={altFor(photo)} className={`rounded-xl border border-line bg-white object-cover ${className}`} />
  );
}

interface PhotoPickerProps {
  label: string;
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  /** The sample the "Use sample photo" button loads */
  sample: Photo;
  sampleButtonLabel: string;
  multiple?: boolean;
  hint?: string;
}

export function PhotoPicker({
  label,
  photos,
  onChange,
  sample,
  sampleButtonLabel,
  multiple = false,
  hint,
}: PhotoPickerProps) {
  const inputId = useId();

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const read = await Promise.all(Array.from(files).map(readFile));
      onChange(multiple ? [...photos, ...read] : [read[0]]);
    } catch {
      // Unreadable file: leave the current photos as they are.
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
        className="block w-full text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2 file:font-bold file:text-cream hover:file:bg-ink-soft"
      />
      {hint && <p className="hint">{hint}</p>}

      <div className="mt-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange(multiple ? [...photos.filter((p) => p.src !== sample.src), sample] : [sample])}
        >
          {sampleButtonLabel}
        </button>
      </div>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <li key={`${photo.name}-${i}`} className="space-y-2">
              <PhotoThumb photo={photo} className="aspect-[4/3] w-full" />
              <button
                type="button"
                className="btn btn-ghost !min-h-11 w-full text-sm"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              >
                Remove photo
                <span className="sr-only">: {photo.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
