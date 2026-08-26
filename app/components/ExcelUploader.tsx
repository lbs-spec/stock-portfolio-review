"use client";

import { useRef, useState } from "react";

interface ExcelUploaderProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  loading?: boolean;
}

export default function ExcelUploader({
  label,
  accept = ".xlsx,.xls",
  onFileSelect,
  loading,
}: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    onFileSelect(file);
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"}
        ${loading ? "opacity-60 pointer-events-none" : ""}
      `}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {loading ? "正在解析..." : label}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        支持拖拽上传，格式：.xlsx / .xls
      </p>
    </div>
  );
}
