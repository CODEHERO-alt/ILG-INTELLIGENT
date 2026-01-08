"use client";

export default function LeadTable({ leads }: { leads: any[] }) {
  return (
    <table className="w-full border">
      <thead>
        <tr>
          <th className="border p-2">Username</th>
          <th className="border p-2">Score</th>
          <th className="border p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td className="border p-2">{lead.username}</td>
            <td className="border p-2">{lead.quality_score}</td>
            <td className="border p-2">{lead.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
