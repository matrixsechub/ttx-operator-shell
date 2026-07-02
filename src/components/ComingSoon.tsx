export function ComingSoon({ title, detail = "Reserved for future expansion." }: { title: string; detail?: string }) {
  return (
    <div className="op-panel-raised flex min-h-32 flex-col items-center justify-center rounded-sm border-dashed p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-op-text-dim">{title}</p>
      <p className="mt-1 max-w-[14rem] text-[11px] text-op-text-dim/70">{detail}</p>
    </div>
  );
}
