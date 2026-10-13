import { PublicFrame } from './public-frame';
export function PublicArticle({
  title,
  intro,
  sections,
  children,
}: {
  title: string;
  intro: string;
  sections: [string, string][];
  children?: React.ReactNode;
}) {
  return (
    <PublicFrame>
      <article className="public-article">
        <h1>{title}</h1>
        <p>{intro}</p>
        {sections.map(([heading, text]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </section>
        ))}
        {children}
      </article>
    </PublicFrame>
  );
}
