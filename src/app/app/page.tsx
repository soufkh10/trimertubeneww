import { LocalClipperWorkspace } from "@/components/local/local-clipper-workspace";

export default async function EditorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LocalClipperWorkspace />
    </div>
  );
}
