'use client';

import { Modal, Text, Button } from '@mantine/core';

interface ReviewAnalysisModalSimpleProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewAnalysisModalSimple({
  isOpen,
  onClose,
}: ReviewAnalysisModalSimpleProps) {
  console.log('✅ SIMPLE 모달 로드됨! isOpen:', isOpen);
  
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="테스트 모달"
      centered
    >
      <Text mb="md">🎉 모달이 작동합니다!</Text>
      <Button onClick={onClose}>닫기</Button>
    </Modal>
  );
}
