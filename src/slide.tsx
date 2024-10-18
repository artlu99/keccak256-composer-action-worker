export const slide = (
    bg: "black" | "white" | "gradient",
    title: string,
    fontSize: number = 60
  ) => {
    const background =
      bg === "gradient" ? "linear-gradient(to right, #432889, #17101F)" : bg;
    const textColor =
      bg === "gradient" ? "white" : bg === "black" ? "white" : "black";
  
    return (
      <div
        style={{
          alignItems: "center",
          background: background,
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: textColor,
            fontSize: fontSize,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          {title}
        </div>
      </div>
    );
  };
  