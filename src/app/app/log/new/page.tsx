import { LedgerEntryForm } from '@/components/LedgerEntryForm';

export default function NewEntryPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-[22px] font-bold md:text-[28px]">New ledger entry</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-variant">
          The form changes with the instrument — a deposit has no scheme, a PPF needs its opening date.
        </p>
      </header>
      <LedgerEntryForm />
    </>
  );
}
