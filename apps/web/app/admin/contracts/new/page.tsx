import { listActiveTemplates, listSnippets } from '@/lib/contracts/queries';
import NewContractForm from './NewContractForm';

export default async function NewContractPage() {
  const [templates, snippets] = await Promise.all([listActiveTemplates(), listSnippets()]);
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-white mb-6">New contract</h1>
      <NewContractForm templates={templates} snippets={snippets} />
    </div>
  );
}
