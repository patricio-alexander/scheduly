import { ImageResponse } from "next/og";

const SUPPORTED_SIZES = new Set([192, 512]);

export function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  return params.then(({ size: rawSize }) => {
    const size = Number(rawSize);

    if (!SUPPORTED_SIZES.has(size)) {
      return new Response("Icon size not found", { status: 404 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            alignItems: "center",
            background: "#006fee",
            color: "#ffffff",
            display: "flex",
            fontSize: size * 0.58,
            fontWeight: 800,
            height: "100%",
            justifyContent: "center",
            width: "100%",
          }}
        >
          S
        </div>
      ),
      { height: size, width: size },
    );
  });
}
