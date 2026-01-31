import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Fonts, Spacing } from "@/constants/theme";
import { 
  WalletTransaction, 
  canRetryOrRefund, 
  getTransactionLabel,
  getTransactionColor 
} from "@/lib/transaction-history-api";

interface Props {
  transaction: WalletTransaction;
  onRetry?: (quoteId: string) => void;
  onRefund?: (quoteId: string) => void;
}

function StatusBadge({ status }: { status: WalletTransaction['status'] }) {
  const getStatusStyle = () => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(0, 255, 0, 0.1)', text: '#00FF00' };
      case 'pending':
        return { bg: 'rgba(255, 200, 0, 0.1)', text: '#FFC800' };
      case 'failed':
        return { bg: 'rgba(255, 0, 0, 0.1)', text: '#FF0000' };
      case 'refunded':
        return { bg: 'rgba(128, 128, 255, 0.1)', text: '#8080FF' };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusText, { color: style.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function TransactionHistoryCard({ transaction, onRetry, onRefund }: Props) {
  const showActions = canRetryOrRefund(transaction);
  const typeLabel = getTransactionLabel(transaction.type);
  const typeColor = getTransactionColor(transaction.type);

  const getTargetLabel = () => {
    switch (transaction.type) {
      case 'receive':
        return 'From';
      case 'shield':
      case 'unshield':
        return 'Wallet';
      default:
        return 'To';
    }
  };

  const getTargetAddress = () => {
    switch (transaction.type) {
      case 'receive':
        return transaction.senderWallet;
      case 'shield':
      case 'unshield':
        return transaction.senderWallet;
      default:
        return transaction.recipientWallet;
    }
  };

  const getDisplaySignature = () => {
    return transaction.withdrawSignature || transaction.signature || null;
  };

  const displaySignature = getDisplaySignature();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.label, { color: typeColor }]}>{typeLabel}</Text>
          <Text style={styles.time}>{formatDate(transaction.createdAt)}</Text>
        </View>
        <StatusBadge status={transaction.status} />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{transaction.amount} SOL</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{getTargetLabel()}</Text>
          <Text style={styles.detailValue}>{truncateAddress(getTargetAddress())}</Text>
        </View>
        {transaction.status === 'pending' && transaction.currentStep ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Step</Text>
            <Text style={styles.stepValue}>{transaction.currentStep.toUpperCase()}</Text>
          </View>
        ) : null}
        {transaction.errorMessage ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{transaction.errorMessage}</Text>
          </View>
        ) : null}
      </View>

      {showActions && transaction.quoteId ? (
        <View style={styles.actions}>
          <Pressable 
            style={styles.retryButton} 
            onPress={() => onRetry?.(transaction.quoteId!)}
          >
            <Text style={styles.retryButtonText}>RETRY</Text>
          </Pressable>
          <Pressable 
            style={styles.refundButton} 
            onPress={() => onRefund?.(transaction.quoteId!)}
          >
            <Text style={styles.refundButtonText}>REFUND</Text>
          </Pressable>
        </View>
      ) : null}

      {displaySignature ? (
        <View style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>TX</Text>
          <Text style={styles.signatureValue}>
            {truncateAddress(displaySignature)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    letterSpacing: 1,
  },
  time: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  details: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  detailValue: {
    fontFamily: Fonts.geistMono,
    fontSize: 11,
    color: '#FFFFFF',
  },
  stepValue: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: '#FFC800',
    letterSpacing: 0.5,
  },
  errorRow: {
    marginTop: 4,
    padding: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#FF6666',
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  retryButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#00FF00',
    paddingVertical: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: '#00FF00',
    letterSpacing: 1,
  },
  refundButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#8080FF',
    paddingVertical: 8,
    alignItems: 'center',
  },
  refundButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: '#8080FF',
    letterSpacing: 1,
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.sm,
  },
  signatureLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  signatureValue: {
    fontFamily: Fonts.geistMono,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
