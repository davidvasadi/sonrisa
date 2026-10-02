import { time } from '@/api';
import { Section, Table, Td } from '@/components/panels/section';
import { useLiveJson } from '@/live';

// Admin panel owned by the email channel, reading the channel's own route (design F7).
type Mail = { id: number; eventId: number; to: string; subject: string; text: string; createdAt: string };

export function EmailOutboxPanel() {
  const { data } = useLiveJson<Mail[]>('/api/channels/email/outbox');
  return (
    <Section title="Email outbox" hint="Email sent while no SMTP server is configured (D-010).">
      <Table head={['Time', 'To', 'Subject']} empty={!data?.length}>
        {data?.map((m) => (
          <tr key={m.id}>
            <Td className="whitespace-nowrap">{time(m.createdAt)}</Td>
            <Td>{m.to}</Td>
            <Td>
              <details>
                <summary className="cursor-pointer">{m.subject}</summary>
                <pre className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{m.text}</pre>
              </details>
            </Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}
