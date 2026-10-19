import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideViewer } from "@/components/GuideViewer";
import { allGuides, guideById } from "@/lib/homeGuides";

export function generateStaticParams() {
  return allGuides().map((g) => ({ id: g.id }));
}

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = guideById(id);
  if (!guide) notFound();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/tenant/home" className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">
        &larr; My home
      </Link>
      <GuideViewer guide={guide} />
      <div className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-bold">Still stuck, or something looks wrong?</p>
        <Link href="/tenant" className="btn btn-primary">
          Tell GoHome
        </Link>
      </div>
    </div>
  );
}
