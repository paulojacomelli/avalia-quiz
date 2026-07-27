import React from 'react';

/**
 * Formata qualquer nome de aplicativo da marca Avalia (ex: "Avalia Quiz", "Avalia JW Quiz", "Avalia Kids")
 * destacando as letras "ia" do prefixo "Avalia" com a cor amarela oficial (#F7D33C).
 */
export const renderFormattedAppTitle = (appName: string = 'Avalia Quiz') => {
  if (appName.startsWith('Avalia')) {
    const restOfName = appName.slice(6); // Pega tudo após "Avalia"
    return (
      <>
        Aval<span className="text-[#F7D33C]">ia</span>{restOfName}
      </>
    );
  }
  return appName;
};
