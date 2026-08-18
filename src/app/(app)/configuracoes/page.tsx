import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { OrganizationForm } from "@/features/settings/components/OrganizationForm";
import { PipelineEditor } from "@/features/settings/components/PipelineEditor";
import { ProfileForm } from "@/features/settings/components/ProfileForm";
import { TeamPanel } from "@/features/settings/components/TeamPanel";
import { getSettingsData } from "@/features/settings/queries";

export default async function ConfiguracoesPage() {
  const { role, profile, organization, members, pipelineId, stages } =
    await getSettingsData();

  const canManage = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          {canManage && <TabsTrigger value="organization">Organização</TabsTrigger>}
          <TabsTrigger value="team">Equipe</TabsTrigger>
          {canManage && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Seu perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                email={profile.email}
                avatarUrl={profile.avatarUrl}
                defaultValues={{ fullName: profile.fullName }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && organization && (
          <TabsContent value="organization" className="pt-4">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Dados da organização</CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationForm
                  defaultValues={{
                    name: organization.name,
                    logoUrl: organization.logoUrl,
                    timezone: organization.timezone,
                    currency: organization.currency,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="team" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamPanel members={members} currentUserId={profile.id} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && pipelineId && (
          <TabsContent value="pipeline" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Colunas do pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <PipelineEditor pipelineId={pipelineId} stages={stages} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
