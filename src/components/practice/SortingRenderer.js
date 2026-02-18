'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortingRenderer.module.css';
import QuestionParts from './QuestionParts';
import { isImageUrl, isInlineSvg } from './contentUtils';
import SafeImage from './SafeImage';

function SortingTile({ index, isSelected, children, dragging = false }) {
  return (
    <div
      className={`${styles.item} ${dragging ? styles.dragging : ''} ${isSelected ? styles.selected : ''}`}
    >
      <div className={styles.itemContent}>{children}</div>
      <div className={styles.positionBadge}>{index + 1}</div>
    </div>
  );
}

function SortableItem({ itemId, index, isAnswered, isSelected, onTap, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
    disabled: isAnswered,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isAnswered ? styles.disabled : ''}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onTap(itemId);
      }}
    >
      <SortingTile index={index} isSelected={isSelected} dragging={isDragging}>
        {children}
      </SortingTile>
    </div>
  );
}

export default function SortingRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const itemIds = useMemo(() => (question.items || []).map((item) => String(item.id)), [question.items]);

  const [items, setItems] = useState(itemIds);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const normalized = Array.isArray(userAnswer) && userAnswer.length > 0 ? userAnswer.map(String) : itemIds;
    setItems(normalized);
    setSelectedItemId(null);
  }, [question.id, itemIds.join('|')]);

  useEffect(() => {
    if (!userAnswer || userAnswer.length === 0) {
      onAnswer(items);
    }
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setActiveId(null);
  }, [question.id]);

  const getItem = (itemId) => {
    return (question.items || []).find((item) => String(item.id) === String(itemId));
  };

  const renderItemContent = (itemId) => {
    const item = getItem(itemId);
    const content = item?.content || '';

    if (isInlineSvg(content)) {
      return (
        <div
          className={styles.itemMedia}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    if (isImageUrl(content)) {
      return (
        <SafeImage
          src={content}
          alt={`Sorted item ${itemId}`}
          className={styles.itemImage}
          width={120}
          height={84}
          sizes="(max-width: 768px) 26vw, 120px"
        />
      );
    }

    return <span>{content}</span>;
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    if (isAnswered) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    onAnswer(reordered);
    setSelectedItemId(null);
  };

  const handleItemTap = (itemId) => {
    if (isAnswered || activeId) return;

    const tappedId = String(itemId);
    if (!selectedItemId) {
      setSelectedItemId(tappedId);
      return;
    }

    if (selectedItemId === tappedId) {
      setSelectedItemId(null);
      return;
    }

    const fromIndex = items.indexOf(selectedItemId);
    const toIndex = items.indexOf(tappedId);
    if (fromIndex < 0 || toIndex < 0) {
      setSelectedItemId(null);
      return;
    }

    const reordered = arrayMove(items, fromIndex, toIndex);
    setItems(reordered);
    onAnswer(reordered);
    setSelectedItemId(null);
  };

  const activeItemIndex = items.findIndex((id) => String(id) === String(activeId));
  const activeItemContent = activeId ? renderItemContent(activeId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.questionCard}>
        <div className={styles.questionContent}>
          <QuestionParts parts={question.parts} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
          onDragStart={({ active }) => {
            setActiveId(String(active.id));
            setSelectedItemId(null);
          }}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={horizontalListSortingStrategy}>
            <div className={styles.sortingArea}>
              {items.map((itemId, index) => (
                <SortableItem
                  key={itemId}
                  itemId={itemId}
                  index={index}
                  isAnswered={isAnswered}
                  isSelected={selectedItemId === String(itemId)}
                  onTap={handleItemTap}
                >
                  {renderItemContent(itemId)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <div className={styles.dragOverlay}>
                <SortingTile index={activeItemIndex >= 0 ? activeItemIndex : 0} isSelected={false} dragging>
                  {activeItemContent}
                </SortingTile>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {question.showSubmitButton && userAnswer && !isAnswered && (
          <button className={styles.submitButton} onClick={() => onSubmit()}>
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );
}
