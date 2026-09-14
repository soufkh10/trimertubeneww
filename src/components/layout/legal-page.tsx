import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string[]; bullets?: string[] }>;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/40">
          <CardTitle className="text-3xl">{title}</CardTitle>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="prose-legal pt-6">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
