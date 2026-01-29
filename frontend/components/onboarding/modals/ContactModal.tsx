'use client';

import { useState } from 'react';
import { Modal, Text, Button, Stack, Textarea, Group, Card, Alert, FileInput, Badge, Loader } from '@mantine/core';
import { 
  MessageCircle, 
  Send, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Upload,
  X,
  Lightbulb,
  Bug,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';

interface ContactModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface AttachmentInfo {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function ContactModal({ opened, onClose, onComplete }: ContactModalProps) {
  const { user, getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');

  const handleClose = () => {
    setStep(1);
    setMessage('');
    setFiles([]);
    setAttachments([]);
    setError('');
    setMessageId('');
    onClose();
  };

  const handleNext = () => {
    if (step === 2 && !message.trim()) {
      setError('문의 내용을 입력해주세요.');
      return;
    }
    setError('');
    
    if (step === 2) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handleFileChange = (selectedFiles: File[] | null) => {
    if (!selectedFiles) {
      setFiles([]);
      return;
    }

    // 최대 3개 제한
    if (selectedFiles.length > 3) {
      setError('파일은 최대 3개까지 첨부할 수 있습니다.');
      return;
    }

    // 각 파일 크기 체크 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (const file of selectedFiles) {
      if (file.size > maxSize) {
        setError(`파일 크기는 최대 10MB까지 가능합니다. (${file.name})`);
        return;
      }
    }

    setFiles(selectedFiles);
    setError('');
  };

  const uploadFiles = async (): Promise<AttachmentInfo[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedAttachments: AttachmentInfo[] = [];

    try {
      const supabase = createClient();
      const userId = user?.id;

      for (const file of files) {
        // 파일명 생성: {user_id}/{timestamp}_{filename}
        const timestamp = Date.now();
        const fileName = `${userId}/${timestamp}_${file.name}`;

        const { data, error: uploadError } = await supabase.storage
          .from('contact-attachments')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`파일 업로드 실패: ${uploadError.message}`);
        }

        // 공개 URL 생성
        const { data: urlData } = supabase.storage
          .from('contact-attachments')
          .getPublicUrl(fileName);

        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
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
      setStep(3); // 완료 단계로 이동

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

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="xl"
      padding="xl"
      centered
      withCloseButton={!loading && !uploading}
      closeOnClickOutside={!loading && !uploading}
      closeOnEscape={!loading && !uploading}
    >
      <Stack gap="xl">
        {/* Step 1: 환영 및 안내 */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: '24px'
              }}>
                <MessageCircle size={48} color="white" />
              </div>
              
              <Text size="28px" fw={700} mb="md">
                윕플에 문의하기
              </Text>
              
              <Text size="16px" c="dimmed" mb="xl">
                궁금한 점이나 불편한 점, 개선 아이디어 등<br />
                무엇이든 편하게 말씀해주세요!
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: '#f8f9fa' }}>
              <Text size="16px" fw={600} mb="lg">
                이런 것들을 문의할 수 있어요
              </Text>
              
              <Stack gap="md">
                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#FFD93D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lightbulb size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="15px">💡 기능 제안</Text>
                    <Text size="13px" c="dimmed">
                      "이런 기능이 있으면 좋겠어요!"
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#FF6B6B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bug size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="15px">🐛 버그 리포트</Text>
                    <Text size="13px" c="dimmed">
                      "이 부분이 제대로 작동하지 않아요"
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#4ECDC4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MessageSquare size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="15px">💬 일반 문의</Text>
                    <Text size="13px" c="dimmed">
                      "이건 어떻게 사용하나요?"
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#51CF66',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ThumbsUp size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="15px">👍 칭찬/피드백</Text>
                    <Text size="13px" c="dimmed">
                      "서비스가 정말 좋아요!"
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>

            <Alert color="blue" variant="light">
              <Text size="14px">
                <strong>💌 답변 시간:</strong> 보통 1-2일 내에 답변 드립니다. 긴급한 경우 이메일로도 연락주세요!
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleNext}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                문의하기
              </Button>
            </Group>
          </>
        )}

        {/* Step 2: 문의 작성 */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <Text size="24px" fw={700} mb="sm">
                무엇을 도와드릴까요?
              </Text>
              <Text size="14px" c="dimmed">
                자세히 적어주실수록 더 정확한 답변을 드릴 수 있어요
              </Text>
            </div>

            <Textarea
              label="문의 내용"
              placeholder="예: 리뷰 분석 기능에서 날짜 필터가 작동하지 않아요. 어제부터 이 문제가 발생했습니다."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError('');
              }}
              error={error}
              minRows={6}
              maxRows={10}
              required
              styles={{
                input: {
                  fontSize: '15px',
                }
              }}
            />

            <div>
              <Text size="14px" fw={500} mb="xs">
                파일 첨부 (선택사항)
              </Text>
              <Text size="12px" c="dimmed" mb="sm">
                스크린샷이나 관련 파일을 첨부하면 더 빠르게 해결할 수 있어요 (최대 3개, 각 10MB)
              </Text>
              
              <FileInput
                placeholder="파일 선택"
                multiple
                value={files}
                onChange={handleFileChange}
                leftSection={<Upload size={16} />}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>

            {/* 선택된 파일 목록 */}
            {files.length > 0 && (
              <Card withBorder p="md" radius="md">
                <Text size="13px" fw={600} mb="sm">
                  첨부 파일 ({files.length}/3)
                </Text>
                <Stack gap="xs">
                  {files.map((file, index) => (
                    <Group key={index} justify="space-between" p="xs" style={{ 
                      background: '#f8f9fa',
                      borderRadius: '6px'
                    }}>
                      <Group gap="xs">
                        <Text size="13px" fw={500}>{file.name}</Text>
                        <Badge size="xs" variant="light">
                          {formatFileSize(file.size)}
                        </Badge>
                      </Group>
                      <Button
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={() => removeFile(index)}
                        leftSection={<X size={14} />}
                      >
                        제거
                      </Button>
                    </Group>
                  ))}
                </Stack>
              </Card>
            )}

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setStep(1)} disabled={loading || uploading}>
                이전
              </Button>
              <Button
                onClick={handleNext}
                disabled={!message.trim() || loading || uploading}
                size="md"
                loading={loading || uploading}
                rightSection={!loading && !uploading ? <Send size={18} /> : undefined}
                style={{ background: message.trim() && !loading && !uploading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined }}
              >
                {uploading ? '파일 업로드 중...' : loading ? '전송 중...' : '문의 전송'}
              </Button>
            </Group>
          </>
        )}

        {/* Step 3: 완료 */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                borderRadius: '50%', 
                background: '#51cf66',
                marginBottom: '16px'
              }}>
                <CheckCircle size={48} color="white" />
              </div>
              
              <Text size="24px" fw={700} mb="sm">
                문의가 전달되었어요!
              </Text>
              <Text size="14px" c="dimmed" mb="xl">
                소중한 의견 감사합니다.<br />
                빠른 시일 내에 답변 드리겠습니다.
              </Text>

              {attachments.length > 0 && (
                <Card withBorder p="md" radius="md" mb="lg">
                  <Text size="13px" c="dimmed">
                    📎 {attachments.length}개 파일 첨부됨
                  </Text>
                </Card>
              )}

              <Card withBorder p="lg" radius="md" style={{ background: '#f8f9fa' }}>
                <Text size="14px" c="dimmed">
                  💌 이메일이나 대시보드 알림으로<br />
                  답변을 받으실 수 있어요
                </Text>
              </Card>
            </div>

            <Group justify="center" mt="md">
              <Button
                onClick={() => {
                  if (onComplete) onComplete();
                  handleClose();
                }}
                size="md"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                확인
              </Button>
            </Group>
          </>
        )}

        {/* Error State */}
        {error && step === 2 && (
          <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
