import React from 'react';

/**
 * Formata qualquer nome de aplicativo da marca Avalia (ex: "Avalia Quiz", "Avalia JW Quiz", "Avalia Kids")
 * destacando as letras "ia" do prefixo "Avalia" com a cor amarela oficial (#F7D33C).
 */
interface FormattedTitleProps {
  appName?: string;
  logo?: React.ReactNode;
  className?: string;
  logoClassName?: string;
}

export const FormattedTitle: React.FC<FormattedTitleProps> = ({
  appName = 'Avalia Quiz',
  logo,
  className = 'flex items-center gap-2.5',
  logoClassName = 'h-7 w-auto object-contain'
}) => {
  const logoElement = logo || <img src="/logo.svg" alt="Logo" className={logoClassName} />;

  return (
    <div className={className}>
      {logoElement}
      <span className="truncate">
        {renderFormattedAppTitle(appName)}
      </span>
    </div>
  );
};

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

