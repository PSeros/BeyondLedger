import React from "react";

type PageToolbarProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
};

export default function PageToolbar({left, center, right}: PageToolbarProps) {
  // Below lg this wraps: row 1 is left + right (actions pushed to the far edge by ml-auto), row 2 is
  // the search field at full width. At lg+ the flex properties are inert and the original
  // three-equal-column grid takes over unchanged. `center` is null on the dashboard toolbar, so it is
  // omitted rather than rendered empty — an empty div would add a phantom gap and a stray wrap row.
  //
  // The columns are placed EXPLICITLY (lg:col-start-*) rather than left to grid auto-placement:
  // without a center child there are only two children, so `right` would auto-flow into column 2 and
  // sit in the middle of the toolbar instead of at its end. `order-*` still drives the flex order
  // below lg, where it is the only thing that applies.
  return (
    <div className="flex flex-wrap items-center gap-3 lg:grid lg:grid-cols-3 lg:gap-0">
      <div className="order-1 min-w-0 lg:col-start-1 lg:justify-self-start">{left}</div>
      {center ? (
        <div className="order-3 w-full min-w-0 lg:order-2 lg:col-start-2 lg:w-auto lg:justify-self-center">
          {center}
        </div>
      ) : null}
      <div className="order-2 ml-auto min-w-0 shrink-0 lg:order-3 lg:col-start-3 lg:ml-0 lg:justify-self-end">
        {right}
      </div>
    </div>
  );
}
