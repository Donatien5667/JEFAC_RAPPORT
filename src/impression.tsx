import { createContext, useContext, useState, type ReactNode } from "react";
import { PrintDocument, type BlocImprimable } from "@/components/PrintDocument";

type Imprimer = (
  titre: string,
  sousTitre: string | undefined,
  blocs: BlocImprimable[],
) => void;

const Ctx = createContext<Imprimer>(() => {});

export function ImpressionProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<{
    titre: string;
    sousTitre?: string;
    blocs: BlocImprimable[];
  } | null>(null);

  const imprimer: Imprimer = (titre, sousTitre, blocs) => {
    setDoc({ titre, sousTitre, blocs });
    setTimeout(() => window.print(), 150);
  };

  return (
    <Ctx.Provider value={imprimer}>
      {children}
      {doc && (
        <PrintDocument
          titre={doc.titre}
          sousTitre={doc.sousTitre}
          blocs={doc.blocs}
        />
      )}
    </Ctx.Provider>
  );
}

export function useImpression(): Imprimer {
  return useContext(Ctx);
}
