import React from "react";

type PageToolbarProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
};

export default function PageToolbar({left, center, right}: PageToolbarProps) {
  return (
    <div className="grid grid-cols-3 items-center">
      <div className="justify-self-start">{left}</div>
      <div className="justify-self-center">{center}</div>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}
