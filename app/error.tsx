"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Chưa thể tải shop</h1>
      <p>
        Vui lòng thử lại. Nếu đây là lần chạy đầu tiên, hãy chạy lệnh thiết lập
        database theo README.
      </p>
      <button className="primary" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
