import { permanentRedirect } from 'next/navigation';

export default function CallLabProRedirect() {
  // 308 permanent redirect: this app URL is retired, so consolidate ranking signal
  // permanently onto the marketing page at timkilroy.com/call-lab-pro.
  permanentRedirect('https://timkilroy.com/call-lab-pro');
}
