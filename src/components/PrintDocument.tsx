import { Logo } from "./Logo";

export type BlocImprimable = {
  titre: string;
  lignes?: [string, string][];
  tableau?: { entetes: string[]; lignes: string[][] };
  note?: string;
};

/** Document imprimable (PDF via la boîte d'impression du téléphone). */
export function PrintDocument({
  titre,
  sousTitre,
  blocs,
}: {
  titre: string;
  sousTitre?: string;
  blocs: BlocImprimable[];
}) {
  return (
    <div className="zone-impression">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Logo taille={44} />
        <div>
          <div
            style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.1em" }}
          >
            JEFAC — RAPPORTS
          </div>
          <div style={{ fontSize: 11 }}>Rapports de formation du dimanche</div>
        </div>
      </div>
      <h1>{titre}</h1>
      {sousTitre && (
        <p style={{ fontSize: 12, margin: "4px 0 12px" }}>{sousTitre}</p>
      )}
      {blocs.map((b, i) => (
        <section key={i} style={{ marginBottom: 14 }}>
          <h2>{b.titre}</h2>
          {b.lignes && (
            <table>
              <tbody>
                {b.lignes.map(([k, v], j) => (
                  <tr key={j}>
                    <th style={{ width: "38%" }}>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {b.tableau && (
            <table>
              <thead>
                <tr>
                  {b.tableau.entetes.map((e, j) => (
                    <th key={j}>{e}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.tableau.lignes.map((l, j) => (
                  <tr key={j}>
                    {l.map((c, k) => (
                      <td key={k}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {b.note && <p style={{ fontSize: 11, marginTop: 4 }}>{b.note}</p>}
        </section>
      ))}
      <p style={{ fontSize: 10, marginTop: 18 }}>
        Document généré par JEFAC Rapports — Excellence et Rayonnement.
      </p>
    </div>
  );
}
