'use client';

import { useState } from 'react';
import { 
  MessageCircle, 
  Send, 
  CheckCircle2,
  Upload,
  X,
  Lightbulb,
  Bug,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import OnboardingModal from './OnboardingModal';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface AttachmentInfo {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function ContactModal({ isOpen, onClose, onComplete }: ContactModalProps) {
  const { user, getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');

  const totalSteps = 3;

  const handleClose = () => {
    setCurrentStep(1);
    setMessage('');
    setFiles([]);
    setAttachments([]);
    setError('');
    setMessageId('');
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1 && !loading && !uploading) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep === 2 && !message.trim()) {
      setError('문의 내용을 입력해주세요.');
      return;
    }
    setError('');
    
    if (currentStep === 2) {
      handleSubmit();
    } else if (currentStep === 3) {
      handleClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) {
      setFiles([]);
      return;
    }

    const fileArray = Array.from(selectedFiles);

    // 최대 3개 제한
    if (fileArray.length > 3) {
      setError('파일은 최대 3개까지 첨부할 수 있습니다.');
      return;
    }

    // 각 파일 크기 체크 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const file of fileArray) {
      if (file.size > maxSize) {
        setError(`파일 크기는 최대 10MB까지 가능합니다. (${file.name})`);
        return;
      }
    }

    setFiles(fileArray);
    setError('');
  };

  const uploadFiles = async (): Promise<AttachmentInfo[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedAttachments: AttachmentInfo[] = [];

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      for (const file of files) {
        // FormData로 파일 전송
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(api.contact.uploadFile(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '파일 업로드 실패');
        }

        const data = await response.json();
        
        uploadedAttachments.push({
          name: data.name,
          url: data.url,
          size: data.size,
          type: data.type
        });
      }

      return uploadedAttachments;
    } catch (err) {
      console.error('파일 업로드 오류:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. 파일 업로드
      const uploadedAttachments = await uploadFiles();
      setAttachments(uploadedAttachments);

      // 2. 문의사항 제출
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(api.contact.submit(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          attachments: uploadedAttachments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '문의 제출에 실패했습니다');
      }

      const data = await response.json();
      setMessageId(data.message_id);
      setCurrentStep(3); // 완료 단계로 이동

    } catch (err) {
      console.error('문의 제출 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Step 1: 환영 및 안내
  const renderStep1 = () => (
    <div className="space-y-0.5">
      <div className="text-center">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight mb-0.5">
          윕플에 문의하기
        </h3>
        <p className="text-[11px] md:text-xs text-neutral-600 leading-tight">
          무엇이든 편하게 말씀해주세요!
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-1.5">
        <CardContent className="p-0 space-y-0.5">
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center gap-1.5 p-1 rounded bg-white">
              <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-2.5 h-2.5 text-white" />
              </div>
              <p className="text-xs font-bold text-neutral-900 leading-tight">💡 기능 제안</p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded bg-white">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <Bug className="w-2.5 h-2.5 text-white" />
              </div>
              <p className="text-xs font-bold text-neutral-900 leading-tight">🐛 버그 리포트</p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded bg-white">
              <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-2.5 h-2.5 text-white" />
              </div>
              <p className="text-xs font-bold text-neutral-900 leading-tight">💬 일반 문의</p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded bg-white">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </div>
              <p className="text-xs font-bold text-neutral-900 leading-tight">👍 칭찬/피드백</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info" className="p-1">
        <AlertTitle className="text-[11px] md:text-xs font-bold text-neutral-900 leading-tight">
          💌 답변 시간
        </AlertTitle>
        <AlertDescription className="text-[10px] text-neutral-600 leading-tight">
          보통 1-2일 내에 답변 드립니다
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 2: 문의 작성
  const renderStep2 = () => (
    <div className="space-y-2 md:space-y-3">
      <div className="text-center space-y-2 mb-2 md:mb-3">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          무엇을 도와드릴까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          자세히 적어주실수록 더 정확한 답변을 드릴 수 있어요
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-neutral-900">
          문의 내용 <span className="text-error">*</span>
        </label>
        <Textarea
          placeholder="예: 리뷰 분석 기능에서 날짜 필터가 작동하지 않아요. 어제부터 이 문제가 발생했습니다."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError('');
          }}
          rows={6}
          className={`resize-none text-sm md:text-base ${error && !message.trim() ? 'border-error' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-neutral-900">
          파일 첨부 (선택사항)
        </label>
        <p className="text-xs md:text-sm text-neutral-600 mb-2">
          스크린샷이나 관련 파일을 첨부하면 더 빠르게 해결할 수 있어요 (최대 3개, 각 10MB)
        </p>
        
        <div className="relative">
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={loading || uploading}
          />
          <label
            htmlFor="file-upload"
            className={`
              flex items-center justify-center gap-2 h-12 md:h-14 px-4 
              border-2 border-dashed border-neutral-300 rounded-lg 
              cursor-pointer transition-all duration-200
              hover:border-primary-400 hover:bg-emerald-50/50
              ${(loading || uploading) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Upload className="w-5 h-5 text-neutral-500" />
            <span className="text-sm md:text-base text-neutral-600">
              파일 선택 ({files.length}/3)
            </span>
          </label>
        </div>
      </div>

      {/* 선택된 파일 목록 */}
      {files.length > 0 && (
        <Card className="border-neutral-200 shadow-sm">
          <CardContent className="p-3 md:p-4 space-y-2">
            <p className="text-xs md:text-sm font-bold text-neutral-900">
              첨부 파일 ({files.length}/3)
            </p>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between gap-2 p-2 bg-neutral-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-neutral-900 truncate">
                      {file.name}
                    </p>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0 p-1 hover:bg-error-bg rounded transition-colors"
                    disabled={loading || uploading}
                  >
                    <X className="w-4 h-4 text-error" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 완료
  const renderStep3 = () => (
    <div className="space-y-2 md:space-y-3">
      <div className="text-center py-3 md:py-4">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          문의가 전달되었어요!
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4">
          소중한 의견 감사합니다.<br />
          빠른 시일 내에 답변 드리겠습니다.
        </p>

        {attachments.length > 0 && (
          <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-3 md:p-4 mb-4">
            <p className="text-xs md:text-sm text-neutral-600">
              📎 {attachments.length}개 파일 첨부됨
            </p>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-emerald-50 to-indigo-50 border-primary-200 shadow-sm p-4 md:p-5">
          <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
            💌 이메일이나 대시보드 알림으로<br />
            답변을 받으실 수 있어요
          </p>
        </Card>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="문의하기"
      icon={MessageCircle}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1 ? '문의하기' : 
        currentStep === 2 ? (uploading ? '파일 업로드 중...' : loading ? '전송 중...' : '문의 전송') : 
        '확인'
      }
      nextButtonDisabled={
        (currentStep === 2 && (!message.trim() || loading || uploading))
      }
      showBackButton={currentStep === 2 && !loading && !uploading}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
