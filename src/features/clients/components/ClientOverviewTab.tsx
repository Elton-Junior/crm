"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDocument, formatPhone } from "@/lib/format";
import type { ClientDetail } from "@/server/clients";

import { CLIENT_STATUS_LABELS } from "../schema";
import { ClientEditSheet } from "./ClientEditSheet";

type Member = { id: string; full_name: string | null };

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export function ClientOverviewTab({
  client,
  members,
}: {
  client: ClientDetail;
  members: Member[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const owner = members.find((m) => m.id === client.ownerId);
  const address = [client.street, client.number].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <PencilIcon />
          Editar
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Identificação
        </h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label={client.kind === "pf" ? "Nome" : "Razão social"} value={client.name} />
          <Field label="Nome fantasia" value={client.tradeName} />
          <Field
            label={client.kind === "pf" ? "CPF" : "CNPJ"}
            value={client.document ? formatDocument(client.document) : null}
          />
          <Field label="Status" value={CLIENT_STATUS_LABELS[client.status]} />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Contato</h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="E-mail" value={client.email} />
          <Field label="Telefone" value={client.phone ? formatPhone(client.phone) : null} />
          <Field label="WhatsApp" value={client.whatsapp ? formatPhone(client.whatsapp) : null} />
          <Field label="Site" value={client.website} />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Endereço</h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Endereço" value={address || null} />
          <Field label="Complemento" value={client.complement} />
          <Field label="Bairro" value={client.district} />
          <Field label="Cidade" value={client.city} />
          <Field label="UF" value={client.state} />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Comercial
        </h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Field label="Segmento" value={client.segment} />
          <Field label="Origem" value={client.source} />
          <Field label="Responsável" value={owner?.full_name ?? null} />
        </dl>
        {client.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {client.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {client.notes ? (
          <div>
            <dt className="text-xs text-muted-foreground">Observações</dt>
            <dd className="whitespace-pre-wrap text-sm">{client.notes}</dd>
          </div>
        ) : null}
      </section>

      <ClientEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        clientId={client.id}
        members={members}
      />
    </div>
  );
}
