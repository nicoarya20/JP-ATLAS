// Bottom sheet body. Register the component with sheet(); PhoneApp renders it inside the library BottomSheet.

/** Sheet layout: title, optional sub line, body, then the action buttons (stacked). */
export function Sheet({ title, sub, children, actions }) {
  return (
    <div className="sheet stack">
      {(title || sub) && (
        <div className="stack xs">
          {title && <h2 className="t-title3">{title}</h2>}
          {sub && <p className="muted">{sub}</p>}
        </div>
      )}
      {children}
      {actions && <div className="stack sm">{actions}</div>}
    </div>
  );
}
