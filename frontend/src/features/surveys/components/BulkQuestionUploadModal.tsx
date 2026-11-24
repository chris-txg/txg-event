'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { surveyClientService } from '@/features/surveys/services/surveyClientService';

export interface BulkQuestionUploadModalProps {
  surveyId: string;
  surveyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface CellError {
  row: number;
  column: string;
  message: string;
}

export function BulkQuestionUploadModal({
  surveyId,
  surveyTitle,
  isOpen,
  onClose,
  onSuccess,
}: BulkQuestionUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<CellError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[] | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await surveyClientService.downloadQuestionTemplate(surveyId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Survey_Questions_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to download template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.xlsx') && !selected.name.endsWith('.xls')) {
        setGeneralError('Please upload an Excel spreadsheet file (.xlsx or .xls).');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrors([]);
      setGeneralError(null);
      setPreviewQuestions(null);
      setSuccessMessage(null);
    }
  };

  const handleValidatePreview = async () => {
    if (!file) return;

    try {
      setIsValidating(true);
      setErrors([]);
      setGeneralError(null);
      setPreviewQuestions(null);

      // dry_run = true
      const res = await surveyClientService.uploadQuestionsExcel(surveyId, file, true);

      if (!res.ok) {
        const errObj = res.error as any;
        if (errObj?.errors && Array.isArray(errObj.errors)) {
          setErrors(errObj.errors);
        }
        setGeneralError(errObj?.detail || 'Formatting errors found in your Excel file.');
        return;
      }

      setPreviewQuestions(res.data?.questions || []);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    try {
      setIsImporting(true);
      setErrors([]);
      setGeneralError(null);

      // dry_run = false (commit to database)
      const res = await surveyClientService.uploadQuestionsExcel(surveyId, file, false);

      if (!res.ok) {
        const errObj = res.error as any;
        if (errObj?.errors && Array.isArray(errObj.errors)) {
          setErrors(errObj.errors);
        }
        setGeneralError(errObj?.detail || 'Import failed.');
        return;
      }

      setSuccessMessage(res.data?.message || 'Questions successfully imported!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setErrors([]);
    setGeneralError(null);
    setPreviewQuestions(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E9DDE1] space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0E6EA] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8EFF2] text-[#762D46] grid place-items-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#30232A]">Import Questions from Excel</h3>
              <p className="text-xs text-stone-400">Bulk upload survey questions via formatted .xlsx file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <Alert variant="success" title="Success!">
            <p>{successMessage}</p>
          </Alert>
        )}

        {/* General Error Banner */}
        {generalError && (
          <Alert variant="error" title="Validation Failed">
            <p>{generalError}</p>
          </Alert>
        )}

        {/* Detailed Cell Errors List (Pop-up reporting) */}
        {errors.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Cell Formatting Issues ({errors.length}):</span>
            </div>
            <p className="text-rose-700 text-[11px]">
              The following cells had invalid formats or missing required options. Please update these rows in your Excel file and upload again:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-white border border-rose-200 text-stone-800 font-mono text-[11px] flex items-start gap-2"
                >
                  <span className="font-bold text-rose-700 shrink-0">
                    Row {err.row > 0 ? err.row : 'Header'} ({err.column}):
                  </span>
                  <span className="font-sans text-stone-700">{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Download Template */}
        <div className="p-4 rounded-xl bg-[#FAF6F7] border border-[#F0E6EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#542037]">Step 1: Download the Excel Template</p>
            <p className="text-[11px] text-stone-500">
              Download the template, read the guide on Sheet 1, then click the 2nd sheet (&quot;Survey Questions&quot;) to write your questions.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#542037] bg-white hover:bg-stone-50 border border-[#E9DDE1] rounded-xl shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isDownloadingTemplate ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
            <span>Download Template</span>
          </button>
        </div>

        {/* Step 2: Upload File Dropzone */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#30232A]">Step 2: Upload Your Filled Excel File</p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E9DDE1] hover:border-[#762D46] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-[#FAF6F7]/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="space-y-1">
                <FileSpreadsheet className="w-8 h-8 text-[#762D46] mx-auto mb-1" />
                <p className="text-xs font-bold text-[#30232A]">{file.name}</p>
                <p className="text-[10px] text-stone-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-[11px] text-[#762D46] hover:underline pt-1">Click to change file</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-stone-700">Click to browse or drag and drop</p>
                <p className="text-[11px] text-stone-400">Microsoft Excel (.xlsx or .xls)</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Verified Questions Preview (If Validated Clean) */}
        {previewQuestions && previewQuestions.length > 0 && (
          <div className="space-y-2 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Format Verified! Ready to import {previewQuestions.length} questions:</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
              {previewQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white border border-emerald-200 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5 truncate max-w-sm">
                    <p className="font-semibold text-stone-800 truncate">
                      Q{idx + 1}: {q.text}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Type: <span className="font-mono uppercase font-bold text-[#762D46]">{q.question_type}</span> &nbsp;|&nbsp;
                      Required: {q.is_required ? 'Yes' : 'No'}
                      {q.choices?.length > 0 ? ` | ${q.choices.length} choices` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F0E6EA]">
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            Clear
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            {!previewQuestions ? (
              <button
                onClick={handleValidatePreview}
                disabled={!file || isValidating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#542037] hover:bg-[#421827] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isValidating ? (
                  <>
                    <Spinner size="sm" />
                    <span>Checking Formats...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Preview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Importing Questions...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Import ({previewQuestions.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
